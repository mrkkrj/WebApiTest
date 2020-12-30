import Html exposing (..)
import Html.App as App
import Html.Attributes exposing (..)
import Html.Events exposing (..)
import Http  
import Time exposing ( Time ) 
import Json.Decode as Json  exposing (..)
import Json.Decode.Extra exposing (..)
import Task
import String



main =
  App.program
    { init = init
    , view = view
    , update = update
    , subscriptions = subscriptions
    }



-- MODEL


type alias ResourceId = String
type HotfolderType = PdfHotf | ImgHotf | XmlHotf | InvalidHotf


type alias Hotfolder =
  { id : ResourceId
  , active : Bool
  , name : String
  , hfType : HotfolderType
  , input : List String
  , output : List String
--  , inQueueCt : Int
--  , rejectedCt : Int
  , hfStatus : String
  }


type alias Model =
  { serverUrl : String
  , hotfolders : List Hotfolder
  , status : Bool
  , statusTxt : String
  }


init : (Model, Cmd Msg)
init  =
  ( Model "localhost:8111" [] True ""
  , Cmd.none
  )



-- UPDATE


type Msg
  = FetchAllHfs
  | FetchAllDone (List Hotfolder)
  | FetchAllFail Http.Error
  | GetTimeThenFetchAllHfs
  | NewTime Time
  -- | FetchAllHfsTimed Time


update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    FetchAllHfs ->
      ({ model | status = True, statusTxt = "Initiating data fetch...", hotfolders = []}, getHotfolderList model.serverUrl 0.0)

    FetchAllDone hotfolderList ->
      ({ model | status = True, statusTxt = "", hotfolders = hotfolderList}, Cmd.none)

    FetchAllFail httpError ->
      ({ model | status = False, statusTxt = toString httpError, hotfolders = []}, Cmd.none)

    GetTimeThenFetchAllHfs ->
      (model , getTime)

{--    NewTime timestamp ->
      (model , FetchAllHfsTimed timestamp)
--}

    NewTime timestamp ->
      ({ model | status = True, statusTxt = "Initiating data fetch...", hotfolders = []}, getHotfolderList model.serverUrl timestamp)




-- VIEW


view : Model -> Html Msg
view model =
  let 
    msgVisible = if model.statusTxt == "" then "hidden" else "visible"
    errorLabel = if model.status == False then "Cannot fetch data from Server: " else ""
    hotfListVisible = if model.status == False then "hidden" else "visible"
    hotfCount = List.length model.hotfolders
  in 
   div []
    [ h2 [] [text "Hotfolder Monitor Tool"]
    , div [ ]
      [ table [ style [("width", "80%")] ] 
        [ 

         tbody []
          [ tr []
            [ td [] [ img [ src "image/logo.png" ] [] ]
            , td [] [  h3 [ style [ ("font-style", "italic") ] ] [text model.serverUrl] ]
            , td [] [ button [ class "tftextbtn-full", onClick GetTimeThenFetchAllHfs ] [ text "Fetch HF List" ] ] 
            ]
          ]  

        ]
      ]

    , br [] []
    , div [ style [ ("visibility", msgVisible) ],  class "error-text"] 
        [ text (errorLabel ++ model.statusTxt) ]
    , h3 [ style [ ("visibility", hotfListVisible) ] ] [ text ("Hotfolders: (count: " ++ (toString hotfCount) ++ ")")  ]
    , div [ style [ ("visibility", hotfListVisible) ] ] [ hotfolderList model.hotfolders]

    ]


hotfolderList : List Hotfolder -> Html Msg
hotfolderList hotfolders =
  -- table with scrollbars
  div [ style [ ("height", "600px"), ("overflow-x", "hidden"), ("overflow-y", "auto") ] ]
    [ table [ class "result-table" ]
      [ thead []
        [ tr []
        [ th [] [ text "Active" ]
        , th [] [ text "Name" ]
        , th [] [ text "Type" ]
        , th [] [ text "Input" ]
        , th [] [ text "Output" ]
        , th [] [ text "Status" ]
        ]
      ]
      , tbody [] (List.map hotfListRow hotfolders)
    ]
  ]


hotfListRow : Hotfolder -> Html Msg
hotfListRow hotfolder =
  tr []
    [ td [] [ text (if hotfolder.active then "enabled" else "disabled") ]
    , td [] [ text hotfolder.name ]
    , td [] [ text (if hotfolder.hfType == PdfHotf then "PDF" else if hotfolder.hfType == ImgHotf then "Image" else if hotfolder.hfType == XmlHotf then "XML" else "???") ]
    , td [] [ text ((String.join ", " hotfolder.input)) ]
    , td [] [ text ((String.join ", " hotfolder.output)) ]
    , td [] [ text hotfolder.hfStatus ]
    ]




-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions model =
  Sub.none




-- HTTP


getTime : Cmd Msg
getTime = Task.perform (\x -> NewTime 0.0) NewTime Time.now


getHotfolderList : String -> Float -> Cmd Msg
getHotfolderList serverUrl timestamp =
  let
    cachebuster = toString timestamp
    url =
      "http://" ++ serverUrl ++ "/resources/workflows?style=detailed" ++ "&_=" ++ cachebuster
  in
    Task.perform FetchAllFail FetchAllDone (Http.get hotfolderListDecoder url)


hotfolderListDecoder : Json.Decoder (List Hotfolder)
hotfolderListDecoder =
  Json.list decodeHotfolder


hotfTypeFromFileExt : String -> HotfolderType
hotfTypeFromFileExt fname = 
  if String.endsWith ".imghf" fname then ImgHotf else PdfHotf


hotfTypeFromHref : String -> HotfolderType
hotfTypeFromHref href = 
  if String.startsWith "resources/workflows/image/" href then ImgHotf 
  else if String.startsWith "resources/workflows/pdf/" href then PdfHotf
  else if String.startsWith "resources/workflows/jt/" href then XmlHotf
  else InvalidHotf


decodeHotfolder : Json.Decoder Hotfolder
decodeHotfolder =
    succeed Hotfolder
        |: ("href" := Json.string) 
        |: ("status" := (Json.at ["active"] Json.bool))
        |: ("name" := Json.string)
        |: ("href" := (Json.object1 hotfTypeFromHref Json.string))
        |: ("parameters" := Json.at ["inputFolders"] (Json.list Json.string))
        |: ("parameters" := Json.at ["outputFolders"] (Json.list Json.string))
        |: ("parameters" := Json.at ["validationState"] Json.string)



-- eof --
